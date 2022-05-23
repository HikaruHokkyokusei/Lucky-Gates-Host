import copy
import json
import logging.handlers
import signal
import sys
import threading
import time

from boxsdk import OAuth2, Client

import Game
import IOTools

mainLogger = logging.getLogger(__name__)
mainLogger.setLevel(logging.DEBUG)
handler = logging.handlers.WatchedFileHandler('pyLog.log', 'w+', 'utf-8')
handler.setLevel(logging.DEBUG)
handler.setFormatter(logging.Formatter(fmt='%(asctime)s - %(levelname)s - %(message)s', datefmt='%Y-%m-%d %H:%M:%S'))
mainLogger.addHandler(handler)

shouldContinue = True
Game_Handler = None
DBHandler = None
IOElements = None
configs = None
configsForRegisteredCoin = None
shouldLogIO = True


def exit_function():
    global shouldContinue
    shouldContinue = False


def build_io_threads():
    return_list = []
    IOTools.set_logger(mainLogger)
    c_i_r = IOTools.ContinuousInputReader(should_log=shouldLogIO)
    c_o_w = IOTools.ContinuousOutputWriter(should_log=shouldLogIO)
    c_i_h = IOTools.ContinuousInputHandler(exit_function=exit_function,
                                           game_handler=Game_Handler, db_handler=DBHandler)
    c_i_r_th = threading.Thread(target=c_i_r.run)
    c_i_h_th = threading.Thread(target=c_i_h.run)
    c_o_w_th = threading.Thread(target=c_o_w.run)
    return_list.append({"Object": c_i_r, "Thread": c_i_r_th})
    return_list.append({"Object": c_i_h, "Thread": c_i_h_th})
    return_list.append({"Object": c_o_w, "Thread": c_o_w_th})
    c_i_r_th.start()
    c_i_h_th.start()
    c_o_w_th.start()
    return return_list


# Old. Not used anymore...
# But good for future reference...
def upload_logs_legacy(box_pat):
    """
    How does box API works?
    First create and account.
    Then, Go to developer console: https://app.box.com/developers/console
    Next, Create a Limited Access APP (Server use only)
    Next, If the app is not authorized in the Authorization Tab, then click on review and submit.
    Next, Go to Admin console -> Apps -> Custom Apps Manager  and  then authorize the app.
    Now, We are set to go. Go the app and generate the primary access token.
    Use that token in the OAuth2.
    All the files created and updated can be viewed in the admin console.
    Admin Console -> Console -> APP_NAME -> ...

    :param box_pat: Box Primary Access Token (For App Token Authorization)
    :return None:
    """
    epoch = time.time()
    py_file_path = "./pyLog.log"
    js_file_path = "./jsLog.log"
    py_file_name = f"LGH-PyLogs-{epoch}.log"
    js_file_name = f"LGH-JsLogs-{epoch}.log"
    box_client = Client(OAuth2(client_id="", client_secret="", access_token=box_pat))
    box_client.folder(box_fid).upload(file_path=py_file_path, file_name=py_file_name)
    box_client.folder(box_fid).upload(file_path=js_file_path, file_name=js_file_name)


def upload_logs():
    box_client = Client(OAuth2(
        client_id=box_cid,
        client_secret=box_cs,
        access_token=box_at,
        refresh_token=box_rt,
        store_tokens=DBHandler.save_box_creds
    ))
    epoch = time.time()
    py_file_path = "./pyLog.log"
    js_file_path = "./jsLog.log"
    py_file_name = f"LGH-PyLogs-{epoch}.log"
    js_file_name = f"LGH-JsLogs-{epoch}.log"
    box_client.folder(box_fid).upload(file_path=py_file_path, file_name=py_file_name)
    box_client.folder(box_fid).upload(file_path=js_file_path, file_name=js_file_name)


class LogWriter(object):
    def __init__(self, writer):
        self._writer = writer
        self._msg = ''

    def write(self, message):
        self._msg = self._msg + message
        while '\n' in self._msg:
            pos = self._msg.find('\n')
            self._writer(self._msg[:pos])
            self._msg = self._msg[pos + 1:]

    def flush(self):
        if self._msg != '':
            self._writer(self._msg)
            self._msg = ''


class GameHandler:
    class GameException(Exception):
        pass

    def __init__(self):
        self.configs = copy.deepcopy(configs)
        self.cFRC = copy.deepcopy(configsForRegisteredCoin)
        self.DBHandler = DBHandler
        self.activeGames = {}
        self.isExiting = False

    def stop(self):
        if not self.isExiting:
            self.isExiting = True
        else:
            return
        for game in self.activeGames:
            game_instance = self.activeGames[game]["Game"]
            game_instance.stop()
            self.save_pending_game_in_database(game_instance.get_game_id(), game_instance.gameState)
        upload_logs()
        DBHandler.stop()
        mainLogger.debug("Python Script Exited")

    def game_completed(self, game_id, game_end_reason):
        pop_element = self.activeGames.pop(game_id, None)
        if pop_element is not None:
            self.send_output(body={
                "gameId": game_id,
                "gameEndReason": game_end_reason
            }, command="gameDeletion")

    def get_game(self, game_id: str) -> Game.GameClass | None:
        return self.activeGames.get(game_id, {}).get("Game", None)

    @staticmethod
    def pay_for_player(game_coin_address, coin_chain_name, player_address, ticket_count: int):
        if ticket_count >= 1:
            return DBHandler.change_player_tickets_by(game_coin_address, coin_chain_name, player_address, -ticket_count)
        else:
            return False

    @staticmethod
    def refund_for_player(game_coin_address, coin_chain_name, player_address, ticket_count: int):
        if ticket_count >= 1:
            return DBHandler.change_player_tickets_by(game_coin_address, coin_chain_name, player_address, ticket_count)
        else:
            return False

    @staticmethod
    def save_pending_game_in_database(game_id, game_state):
        DBHandler.upsert_document("PendingGames", {"gameId": game_id}, {"gameState": game_state})

    @staticmethod
    def save_game_in_archive_database(game_id, game_state):
        DBHandler.delete_matching_documents("PendingGames", {"gameId": game_id})
        DBHandler.insert_new_document("CompletedGames", {"gameId": game_id, "gameState": game_state})

    @staticmethod
    def send_output(body: dict, command: str, action: str = None, request_id: str = None, origin: str = None):
        if request_id is not None and origin is not None:
            IOTools.append_packet_buffer(body, command, action, request_id, origin)
        elif request_id is not None:
            IOTools.append_packet_buffer(body, command, action, request_id=request_id)
        elif origin is not None:
            IOTools.append_packet_buffer(body, command, action, origin=origin)
        else:
            IOTools.append_packet_buffer(body, command, action)

    def handle_action(self, packet_body, action):
        reply_body = {"error": None}
        reply_action = None

        if action == "createNewGame":
            reply_command = "gameCreation"

            g_c_a = packet_body.get("gameCoinAddress") if packet_body is not None else None
            c_c_n = packet_body.get("coinChainName") if packet_body is not None else None
            game_creator = packet_body.get("gameCreator") if packet_body is not None else None

            try:
                if game_creator is not None:
                    reply_body["gameState"] = {
                        "gameCreator": game_creator
                    }
                    if g_c_a is not None and c_c_n is not None:
                        if DBHandler.is_game_coin_registered(g_c_a, c_c_n):
                            game_id, game_state = self.create_new_game(g_c_a, c_c_n, game_creator)
                        else:
                            raise self.GameException("Coin with given address and chain is not Registered")
                    else:
                        game_id, game_state = self.create_new_game(game_creator=game_creator)
                else:
                    raise self.GameException("Game Creator Not Specified")

                reply_body["gameId"] = game_id
                reply_body["gameCreator"] = game_state["gameCreator"]
                reply_body["gameState"] = game_state
            except self.GameException as err:
                reply_body["error"] = str(err)
        elif action == "addPlayerToGame":
            reply_command = "playerAddition"
            reply_body["result"] = "Failure"
            reply_body["gameId"] = packet_body.get("gameId") if packet_body is not None else None
            reply_body["playerAddress"] = packet_body.get("playerAddress") if packet_body is not None else None

            try:
                if reply_body["gameId"] is None or reply_body["playerAddress"] is None:
                    raise self.GameException("Either of gameId or playerAddress field missing from the body")
                success, message, game_state = self.add_player_to_game(packet_body["gameId"],
                                                                       packet_body["playerAddress"])
                if not success:
                    reply_body["error"] = message
                else:
                    reply_body["gameState"] = game_state
                    reply_body["result"] = "Success"
            except self.GameException as err:
                reply_body["error"] = str(err)
        elif action == "beginGameEarly":
            reply_command = "informPlayers"
            reply_action = "earlyGameBeginning"
            reply_body["result"] = "Failure"
            reply_body["gameId"] = packet_body.get("gameId") if packet_body is not None else None

            try:
                if reply_body["gameId"] is None:
                    raise self.GameException("gameId field missing from the body")
                game = self.get_game(reply_body["gameId"])
                if game is None:
                    raise self.GameException("No such game exists")

                if game.shouldBeginEarly:
                    success = False
                    message = "The Game is already begun early"
                else:
                    success, message = game.begin_game_early()

                if not success:
                    reply_body["error"] = message
                else:
                    reply_body["gameState"] = copy.deepcopy(game.gameState)
                    reply_body["result"] = "Success"
                    reply_body["message"] = message
            except self.GameException as err:
                reply_body["error"] = str(err)
        elif action == "savePlayerDoorSelection":
            reply_command = "informPlayers"
            reply_action = "doorSelection"
            reply_body["result"] = "Failure"
            reply_body["gameId"] = packet_body.get("gameId") if packet_body is not None else None
            reply_body["playerAddress"] = packet_body.get("playerAddress") if packet_body is not None else None

            if reply_body["gameId"] is not None and reply_body["playerAddress"] is not None:
                game = self.get_game(reply_body["gameId"])
                if game is None:
                    reply_body["error"] = "No such game exists"
                else:
                    door_number = packet_body.get("doorNumber")

                    if door_number is not None:
                        success, message = game.set_door_selection_for_player(reply_body["playerAddress"], door_number)
                        if success:
                            reply_body["result"] = "Success"
                            reply_body["gameState"] = copy.deepcopy(game.gameState)
                        else:
                            reply_body["error"] = message
                    else:
                        reply_body["error"] = "No Door Number Specified"
            else:
                reply_body["error"] = "Either of gameId or playerAddress field missing from the body"
        elif action == "savePlayerSwitchSelection":
            reply_command = "informPlayers"
            reply_action = "switchSelection"
            reply_body["result"] = "Failure"
            reply_body["gameId"] = packet_body.get("gameId") if packet_body is not None else None
            reply_body["playerAddress"] = packet_body.get("playerAddress") if packet_body is not None else None

            if reply_body["gameId"] is not None and reply_body["playerAddress"] is not None:
                game = self.get_game(reply_body["gameId"])

                if game is None:
                    reply_body["error"] = "No such game exists"
                else:
                    want_to_switch = packet_body.get("wantToSwitch")
                    if want_to_switch is not None:
                        success, message = game.set_switch_selection_for_player(reply_body["playerAddress"],
                                                                                want_to_switch)
                        if success:
                            reply_body["result"] = "Success"
                            reply_body["gameState"] = copy.deepcopy(game.gameState)
                        else:
                            reply_body["error"] = message
                    else:
                        reply_body["error"] = "Switch Choice Not Specified"
            else:
                reply_body["error"] = "Either of gameId or playerAddress field missing from the body"
        elif action == "rewardSent":
            game_id = packet_body.get("gameId")
            trx_hash = packet_body.get("trxHash")

            if game_id is not None:
                game = self.get_game(game_id)

                if game is not None:
                    game.set_reward_sent(trx_hash)

            return None, None, None
        else:
            reply_command = "error"
            reply_body["error"] = "Action Not Specified for a Game Packet"

        return reply_command, reply_action, reply_body

    def handle_game_packet(self, packet):
        action = packet["Header"].get("action")
        packet_body = packet.get("Body")

        try:
            reply_command, reply_action, reply_body = self.handle_action(packet_body, action)
        except Exception as err:
            mainLogger.exception(err)
            reply_command = "error"
            reply_action = None
            reply_body = {"error": "Error during execution of action"}

        if reply_command is not None:
            self.send_output(reply_body, reply_command, reply_action,
                             packet["Header"].get("requestId"), packet["Header"].get("origin"))

    def create_game_with_options(self, options, pending_game_state=None):
        if len(self.activeGames) >= self.configs["generalValues"]["maxGameCap"]:
            raise self.GameException("Max Game Limit Reached")

        c_data = self.cFRC[options["coinChainName"]]["registeredCoinAddresses"][options["gameCoinAddress"]]
        server_ticket_cost = c_data["serverTicketCost"]
        reward_percent = c_data["otherOptions"]["rewardPercent"]
        min_players = c_data["otherOptions"].get("minPlayers")

        if pending_game_state is None:
            new_game = Game.GameClass(handler_parent=self,
                                      general_values=copy.deepcopy(self.configs["generalValues"]),
                                      default_game_values=copy.deepcopy(self.configs["defaultGameValues"]),
                                      default_player_values=copy.deepcopy(self.configs["defaultPlayerValues"]),
                                      build_options=options, server_ticket_cost=server_ticket_cost,
                                      reward_percent=reward_percent, min_players=min_players,
                                      stage_durations=copy.deepcopy(self.configs["stageDurations"]))
        else:
            new_game = Game.GameClass(handler_parent=self,
                                      general_values=copy.deepcopy(self.configs["generalValues"]),
                                      default_game_values=copy.deepcopy(self.configs["defaultGameValues"]),
                                      default_player_values=copy.deepcopy(self.configs["defaultPlayerValues"]),
                                      build_options=None, server_ticket_cost=server_ticket_cost,
                                      reward_percent=reward_percent, pending_game_state=pending_game_state,
                                      stage_durations=copy.deepcopy(self.configs["stageDurations"]))

        th = threading.Thread(target=new_game.run)
        th.start()
        self.activeGames[new_game.get_game_id()] = {"Game": new_game, "Thread": th}
        return new_game.get_game_id(), new_game.gameState

    def create_new_game(self, game_coin_address=None, coin_chain_name=None, game_creator=None):
        build_options = {}
        if game_coin_address is not None:
            build_options["gameCoinAddress"] = game_coin_address
        if coin_chain_name is not None:
            build_options["coinChainName"] = coin_chain_name
        if game_creator is not None:
            build_options["gameCreator"] = game_creator

        return self.create_game_with_options(options=build_options)

    def rebuild_pending_games(self):
        game_doc_list = None
        if DBHandler is not None:
            game_doc_list = DBHandler.get_pending_game_list()
        if game_doc_list is not None:
            for game_doc in game_doc_list:
                game_state = game_doc["gameState"]
                try:
                    options = {
                        "coinChainName": game_state["coinChainName"],
                        "gameCoinAddress": game_state["gameCoinAddress"]
                    }
                    gi, gs = self.create_game_with_options(options=options, pending_game_state=game_state)
                    self.send_output({
                        "gameId": gi,
                        "gameState": gs
                    }, "rebuildFromDB", "newPendingGame", origin="js")
                except self.GameException as err:
                    mainLogger.exception(err)

    def add_player_to_game(self, game_id, player_address):
        game = self.get_game(game_id)
        if game is not None:
            has_tickets, ticket_count = DBHandler.does_user_has_tickets(game.gameState["gameCoinAddress"],
                                                                        game.gameState["coinChainName"], player_address)
            if has_tickets:
                success, message = game.add_player_to_game({"playerAddress": player_address})
                return success, message, copy.deepcopy(game.gameState)
            else:
                raise self.GameException("Player Has 0 Tickets. Cannot Join This Game")
        else:
            raise self.GameException("No such game exists")


def exit_handler(exit_signal, frame_type):
    mainLogger.debug("Exit Handler Called. Signal : " + str(exit_signal))
    for io_elem in IOElements:
        io_elem["Object"].stop()
        if io_elem["Thread"].is_alive():
            io_elem["Thread"].join()

    Game_Handler.stop()  # Internally also calls DBHandler.stop()


signal.signal(signal.SIGINT, exit_handler)
signal.signal(signal.SIGTERM, exit_handler)

if __name__ == '__main__':
    if len(sys.argv) >= 6:
        sys.stderr = LogWriter(mainLogger.warning)

        configs_file = open("./configs.json", "r")
        configs = json.load(configs_file)
        configs_file.close()
        configs_file = open("./configsForRegisteredCoin.json", "r")
        configsForRegisteredCoin = json.load(configs_file)
        configs_file.close()

        Game.set_logger(mainLogger)
        Game_Handler = GameHandler()
        DBHandler = IOTools.DBHandler(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
        box_fid = sys.argv[5]
        # box_pat = sys.argv[6]
        box_cid, box_cs, box_at, box_rt = DBHandler.get_box_creds()

        IOElements = build_io_threads()

        try:
            while shouldContinue:
                time.sleep(2.5)
        except KeyboardInterrupt as ki_err:
            mainLogger.exception(ki_err)
