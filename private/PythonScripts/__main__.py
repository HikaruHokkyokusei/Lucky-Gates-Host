import json
import sys
import threading
import time

import IOTools
from Game import Game

shouldContinue = True
Game_Handler = None
DBHandler = None


def exit_function():
    global shouldContinue
    shouldContinue = False


def build_io_threads():
    return_list = []
    c_i_r = IOTools.ContinuousInputReader()
    c_i_h = IOTools.ContinuousInputHandler(exit_function=exit_function, game_handler=Game_Handler)
    c_o_w = IOTools.ContinuousOutputWriter()
    c_i_r_th = threading.Thread(target=c_i_r.run)
    c_i_r_th.daemon = True
    c_i_h_th = threading.Thread(target=c_i_h.run)
    c_o_w_th = threading.Thread(target=c_o_w.run)
    return_list.append({"Object": c_i_r, "Thread": c_i_r_th})
    return_list.append({"Object": c_i_h, "Thread": c_i_h_th})
    return_list.append({"Object": c_o_w, "Thread": c_o_w_th})
    c_i_r_th.start()
    c_i_h_th.start()
    c_o_w_th.start()
    return return_list


class GameHandler:
    class GameException(Exception):
        pass

    def __init__(self):
        configs_file = open("./configs.json", "r")
        self.configs = json.load(configs_file)
        configs_file.close()
        self.activeGames = {}

    def stop(self):
        for game in self.activeGames:
            game.stop()
            self.save_pending_game_in_database(game.get_game_id(), game.gameState)
        DBHandler.stop()
        exit_message = {"message": "Python Script Exited"}
        print(f"{json.dumps(exit_message)}")
        sys.stdout.flush()

    def game_completed(self, game_id):
        self.activeGames.pop(game_id, None)

    def get_game(self, game_id: str) -> Game | None:
        if game_id in self.activeGames:
            return self.activeGames[game_id]["Game"]
        else:
            return None

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

    def handle_game_packet(self, packet):
        action = packet["Header"].get("action")
        packet_body = packet.get("Body")

        reply_body = {"error": None}

        if action == "createNewGame":
            reply_command = "gameCreation"

            g_c_a = packet_body.get("gameCoinAddress") if packet_body is not None else None
            c_c_n = packet_body.get("coinChainName") if packet_body is not None else None
            try:
                if g_c_a is not None and c_c_n is not None:
                    game_id, game_state = self.create_new_game(g_c_a, c_c_n)
                else:
                    game_id, game_state = self.create_new_game()

                reply_body["gameId"] = game_id
                reply_body["gameState"] = game_state
            except self.GameException as e:
                reply_body["error"] = str(e)
        elif action == "addPlayerToGame":
            reply_command = "playerAddition"
            reply_body["result"] = "Failure"
            reply_body["gameId"] = packet_body.get("gameId") if packet_body is not None else None
            reply_body["playerAddress"] = packet_body.get("playerAddress") if packet_body is not None else None

            try:
                if reply_body["gameId"] is None or reply_body["playerAddress"] is None:
                    raise self.GameException("Either of gameId or playerAddress field missing from the body")
                success, message = self.add_player_to_game(packet_body["gameId"], packet_body["playerAddress"])
                if not success:
                    reply_body["error"] = message
                else:
                    reply_body["result"] = "Success"
            except self.GameException as e:
                reply_body["error"] = str(e)
        elif action == "savePlayerDoorSelection":
            reply_command = "doorSelection"
            reply_body["result"] = "Failure"
            reply_body["gameId"] = packet_body.get("gameId") if packet_body is not None else None
            reply_body["playerAddress"] = packet_body.get("playerAddress") if packet_body is not None else None

            if reply_body["gameId"] is not None and reply_body["playerAddress"] is not None:
                game = self.get_game(reply_body["gameId"])
                door_number = packet_body.get("door_number")
                if door_number is not None:
                    success, message = game.set_door_selection_for_player(reply_body["playerAddress"], door_number)
                    if success:
                        reply_body["result"] = "Success"
                    else:
                        reply_body["error"] = message
                else:
                    reply_body["error"] = "No Door Number Specified"
            else:
                reply_body["error"] = "Either of gameId or playerAddress field missing from the body"
        elif action == "savePlayerSwitchSelection":
            reply_command = "switchSelection"
            reply_body["result"] = "Failure"
            reply_body["gameId"] = packet_body.get("gameId") if packet_body is not None else None
            reply_body["playerAddress"] = packet_body.get("playerAddress") if packet_body is not None else None

            if reply_body["gameId"] is not None and reply_body["playerAddress"] is not None:
                game = self.get_game(reply_body["gameId"])
                want_to_switch = packet_body.get("wantToSwitch")
                if want_to_switch is not None:
                    success, message = game.set_switch_selection_for_player(reply_body["playerAddress"], want_to_switch)
                    if success:
                        reply_body["result"] = "Success"
                    else:
                        reply_body["error"] = message
                else:
                    reply_body["error"] = "Switch Choice Not Specified"
            else:
                reply_body["error"] = "Either of gameId or playerAddress field missing from the body"
        else:
            return

        self.send_output(reply_body, reply_command, request_id=packet["Header"].get("requestId"),
                         origin=packet["Header"].get("origin"))

    def create_game_with_options(self, build_options):
        if len(self.activeGames) >= self.configs["generalValues"]["maxGameCap"]:
            raise self.GameException("Max Game Limit Reached")
        new_game = Game(handler_parent=self,
                        general_values=self.configs["generalValues"],
                        default_game_values=self.configs["defaultGameValues"],
                        default_player_values=self.configs["defaultPlayerValues"],
                        build_options=build_options, stage_durations=self.configs["stageDurations"])
        th = threading.Thread(target=new_game.run)
        th.start()
        self.activeGames[new_game.get_game_id()] = {"Game": new_game, "Thread": th}
        return new_game.get_game_id(), new_game.gameState

    def create_new_game(self, game_coin_address=None, coin_chain_name=None):
        if game_coin_address is None:
            return self.create_game_with_options({})
        else:
            return self.create_game_with_options({
                "gameCoinAddress": game_coin_address,
                "coinChainName": coin_chain_name
            })

    def rebuild_pending_games(self):
        game_states_list = None
        if DBHandler is not None:
            game_states_list = DBHandler.get_pending_game_list()
        if game_states_list is not None:
            for game_state in game_states_list:
                try:
                    self.create_game_with_options(game_state)
                except self.GameException:
                    pass

    def add_player_to_game(self, game_id, player_address):
        # TODO : Add check for number of tickets for the player
        game = self.get_game(game_id)
        if game_id is not None:
            return game.add_player_to_game({"playerAddress": player_address})
        else:
            raise self.GameException("No such game exists")


if __name__ == '__main__':
    if len(sys.argv) >= 5:
        Game_Handler = GameHandler()
        DBHandler = IOTools.DBHandler(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
        io_elements = build_io_threads()

        try:
            while shouldContinue:
                time.sleep(2.5)
        except KeyboardInterrupt:
            pass

        for io_elem in io_elements:
            io_elem["Object"].stop()
            if io_elem["Thread"].is_alive():
                io_elem["Thread"].join()

        Game_Handler.stop()  # Internally also calls DBHandler.stop()
