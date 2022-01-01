import json
import logging
import sys
import time
import uuid

import pymongo

ioLogger = logging.getLogger(__name__)
InputBuffer = []
OutputBuffer = []
sleepTime = 0.25


def append_packet_buffer(body: dict, command: str, action: str,
                         request_id: str = str(uuid.uuid4()), origin: str = "py"):
    if body is None:
        body = {}
    packet = {
        "Header": {
            "command": command,
            "action": action,
            "requestId": request_id,
            "origin": origin,
            "sender": "py"
        },
        "Body": body
    }
    OutputBuffer.append(packet)


def set_logger(logger_ref):
    global ioLogger
    ioLogger = logger_ref


class ContinuousOutputWriter:
    def __init__(self, should_log):
        self.should_write = True
        self.should_log = should_log

    def stop(self):
        self.should_write = False

    def run(self):
        while self.should_write:
            while len(OutputBuffer) > 0:
                message = json.dumps(OutputBuffer.pop(0))
                if self.should_log:
                    ioLogger.debug(f"Out : {message}")
                print(f"{message}")
                sys.stdout.flush()
            time.sleep(sleepTime)


class ContinuousInputReader:
    def __init__(self):
        self.should_read = True

    def stop(self):
        self.should_read = False

    def run(self):
        while self.should_read:
            inp = input()
            try:
                inp = json.loads(inp)
                InputBuffer.append(inp)
            except Exception as err:
                ioLogger.debug(f"In : {inp}")
                ioLogger.exception(err)
            time.sleep(sleepTime)


class ContinuousInputHandler:
    def __init__(self, should_log, exit_function, game_handler, db_handler):
        self.should_handle = True
        self.should_log = should_log
        self.DBHandler = db_handler
        self.exit_function = exit_function
        self.game_handler = game_handler

    def stop(self):
        self.should_handle = False

    def root_handler(self, packet):
        command = packet.get("Header", {}).get("command", None)
        if command is None:
            return

        if self.should_log:
            if command != "ticket" or packet["Header"]["action"] != "get":
                ioLogger.debug(f"In : {packet}")

        if command == "exit":
            self.exit_function()
        elif command == "rebuildFromDB":
            self.game_handler.rebuild_pending_games()
            append_packet_buffer({}, command, "rebuildComplete", packet["Header"]["requestId"], "js")
        elif command == "game":
            self.game_handler.handle_game_packet(packet)
        elif command == "authWallets":
            action = packet["Header"].get("action")
            if action is None:
                return

            if action == "get":
                pub_key, pri_key = self.DBHandler.get_wallets()
                reply_body = {
                    "publicKeys": pub_key,
                    "privateKeys": pri_key
                }
                append_packet_buffer(reply_body, "authWallets", "get", packet["Header"]["requestId"], "js")
        elif command == "ticket":
            action = packet["Header"].get("action")
            if action is None:
                return

            player_address = packet.get("Body", {}).get("playerAddress", None)
            coin_chain_name = packet.get("Body", {}).get("coinChainName", None)
            game_coin_address = packet["Body"].get("gameCoinAddress", None)

            reply_body = {"error": None}
            if coin_chain_name is None or game_coin_address is None or player_address is None:
                reply_body["error"] = "Incomplete Information."
                append_packet_buffer(reply_body, "ticket", action, packet["Header"]["requestId"], "js")
                return

            reply_body["playerAddress"] = player_address
            reply_body["coinChainName"] = coin_chain_name
            reply_body["gameCoinAddress"] = game_coin_address

            if action == "buy":
                ticket_count = packet["Body"].get("ticketCount")
                reference_id = packet["Body"].get("referenceId")
                if ticket_count is None or ticket_count <= 0 or reference_id is None:
                    reply_body["error"] = "Invalid ticket amount or reference id"
                else:
                    success = self.DBHandler.change_player_tickets_by(
                        game_coin_address, coin_chain_name, player_address, ticket_count, reference_id
                    )
                    if not success:
                        reply_body["error"] = "Unable to update tickets."
            elif action == "get":
                has_tickets, ticket_count = self.DBHandler.does_user_has_tickets(
                    game_coin_address, coin_chain_name, player_address
                )
            else:
                ticket_count = None
                reply_body["error"] = "Invalid action"

            reply_body["ticketCount"] = ticket_count
            append_packet_buffer(reply_body, "ticket", action, packet["Header"]["requestId"], "js")
        else:
            ioLogger.error(f"Invalid input command : {command}")

    def run(self):
        while self.should_handle:
            while len(InputBuffer) > 0:
                try:
                    self.root_handler(InputBuffer.pop(0))
                except Exception as e:
                    ioLogger.exception(e)
            time.sleep(sleepTime)


class DBHandler:
    def __init__(self, username, password, cluster_name, database_name):
        cluster_name = cluster_name.replace(" ", "").lower()
        connect_url = f"mongodb+srv://{username}:{password}@{cluster_name}.zm0r5.mongodb.net/test?retryWrites=true"
        self.cluster = pymongo.MongoClient(connect_url)
        self.database = self.cluster[database_name]

    def stop(self):
        self.cluster.close()

    def delete_matching_documents(self, collection_name, match_document):
        self.database[collection_name].delete_many(match_document)

    def pop_all_documents(self, collection_name, common_key):
        found_documents = self.database[collection_name].find({})
        self.database[collection_name].delete_many({common_key: {"$regex": ".*"}})
        return found_documents

    def upsert_document(self, collection_name, match_document, new_document):
        self.database[collection_name].update_one(match_document, {"$set": new_document}, upsert=True)

    def insert_new_document(self, collection_name, new_document):
        self.database[collection_name].insert_one(new_document)

    def get_pending_game_list(self):
        popped_doc_list = self.pop_all_documents("PendingGames", "gameId")
        return_list = []
        for document in popped_doc_list:
            return_list.append(document["gameState"])
        return return_list

    def is_game_coin_registered(self, game_coin_address, coin_chain_name):
        reg_coin_list = self.database["_Root"].find_one({"id": "Coin Registry"})["registeredCoins"]
        chain_coin_list = reg_coin_list.get(coin_chain_name, None)
        if chain_coin_list is not None:
            return game_coin_address in chain_coin_list
        else:
            return False

    def does_user_has_tickets(self, game_coin_address, coin_chain_name, player_address):
        player_document = self.database["PlayerTickets"].find_one({
            "playerAddress": player_address
        })

        if player_document is not None:
            ticket_count = player_document.get("tickets", {}).get(coin_chain_name, {}).get(game_coin_address, None)
            if ticket_count is not None and ticket_count >= 1:
                return True, ticket_count

        return False, 0

    def get_wallets(self):
        found_document = self.database["_Root"].find_one({"id": "Wallets"})
        public_keys = found_document["publicKeys"]
        private_keys = found_document["privateKeys"]
        return public_keys, private_keys

    def change_player_tickets_by(self, game_coin_address, coin_chain_name, player_address,
                                 signed_amount, reference_id=None):
        player_tickets_collection = self.database["PlayerTickets"]
        player_document = {"playerAddress": player_address}

        if self.is_game_coin_registered(game_coin_address, coin_chain_name):
            try:
                found_player_doc = player_tickets_collection.find_one(player_document)
                if found_player_doc is None:
                    if signed_amount >= 0:
                        insert_doc = {
                            "playerAddress": player_address,
                            "referenceIds": {},
                            "tickets": {
                                coin_chain_name: {
                                    game_coin_address: signed_amount
                                }
                            }
                        }
                        if reference_id is not None:
                            insert_doc["referenceIds"] = {reference_id: True}
                        player_tickets_collection.insert_one(insert_doc)
                        return True
                else:
                    ticket_count = found_player_doc.get("tickets", {}).get(coin_chain_name, {}) \
                        .get(game_coin_address, 0)
                    new_ticket_count = ticket_count + signed_amount

                    update_doc = {
                        "tickets." + coin_chain_name + "." + game_coin_address: new_ticket_count
                    }
                    if reference_id is not None:
                        update_doc["referenceIds." + reference_id] = True

                    if new_ticket_count >= 0:
                        player_tickets_collection.update_one(player_document, {
                            "$set": update_doc
                        }, upsert=True)
                        return True
            except Exception as e:
                ioLogger.exception(e)

        return False
