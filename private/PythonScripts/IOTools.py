import json
import sys
import time
import uuid

import pymongo

InputBuffer = []
OutputBuffer = []
sleepTime = 0.2


def append_packet_buffer(body: dict, command: str, action: str,
                         request_id: str = str(uuid.uuid4()), origin: str = "py"):
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


class ContinuousOutputWriter:
    def __init__(self):
        self.should_write = True

    def stop(self):
        self.should_write = False

    def run(self):
        while self.should_write:
            while len(OutputBuffer) > 0:
                print(f"{json.dumps(OutputBuffer.pop(0))}")
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
                # print(str(inp))
            except json.decoder.JSONDecodeError:
                # TODO : Handle this exception...
                # print(inp)  # Non-Json Input...
                pass
            time.sleep(sleepTime)


class ContinuousInputHandler:
    def __init__(self, exit_function, game_handler):
        self.should_handle = True
        self.exit_function = exit_function
        self.game_handler = game_handler

    def stop(self):
        self.should_handle = False

    def root_handler(self, packet):
        header = packet.get("Header")
        if header is None:
            return
        command = header.get("command")
        if command is None:
            return
        elif command == "exit":
            self.exit_function()
        elif command == "rebuildFromDB":
            self.game_handler.rebuild_pending_games()
        elif command == "game":
            self.game_handler.handle_game_packet(packet)
        elif command == "user":
            # TODO : Update DB for number of ticket for the specified user
            pass
        else:
            # TODO : Probably log using a logger...
            pass

    def run(self):
        while self.should_handle:
            while len(InputBuffer) > 0:
                try:
                    self.root_handler(InputBuffer.pop(0))
                except Exception as e:
                    print(e, file=sys.stderr)
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
                return True

        return False

    def change_player_tickets_by(self, game_coin_address, coin_chain_name, player_address, signed_amount):
        player_tickets_collection = self.database["PlayerTickets"]
        player_document = {"playerAddress": player_address}

        try:
            found_player_doc = player_tickets_collection.find_one(player_document)
            ticket_count = found_player_doc["tickets"][coin_chain_name][game_coin_address]

            new_ticket_count = ticket_count + signed_amount
            if 0 <= new_ticket_count:
                player_tickets_collection.update_one(player_document, {
                    "$set": {
                        "tickets." + coin_chain_name + "." + game_coin_address: new_ticket_count
                    }
                })
                return True
        except Exception as e:
            print(str(e), sys.stderr)
        return False
