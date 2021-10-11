from Game import Game
import IOTools
import json
import sys
import threading
import time

shouldContinue = True
Game_Handler = None
DBHandler = None


def exit_function():
    global shouldContinue
    shouldContinue = False


def build_io_threads():
    return_list = []
    c_f_r = IOTools.ContinuousFileReader("./communicationFile.txt")
    c_i_h = IOTools.ContinuousInputHandler(exit_function=exit_function, game_handler=Game_Handler)
    c_o_w = IOTools.ContinuousOutputWriter()
    c_f_r_th = threading.Thread(target=c_f_r.run)
    c_i_h_th = threading.Thread(target=c_i_h.run)
    c_o_w_th = threading.Thread(target=c_o_w.run)
    return_list.append({"Object": c_f_r, "Thread": c_f_r_th})
    return_list.append({"Object": c_i_h, "Thread": c_i_h_th})
    return_list.append({"Object": c_o_w, "Thread": c_o_w_th})
    c_f_r_th.start()
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
            # TODO : Add more functionalities
            # Stop games... Save states to DB
            pass
        DBHandler.stop()
        exit_message = {"message": "Script Exited"}
        print(f"{json.dumps(exit_message)}")
        sys.stdout.flush()

    @staticmethod
    def save_pending_game_in_database(game_id, game_state):
        DBHandler.upsert_document("PendingGames", {"gameId": game_id}, {"gameState": game_state})

    @staticmethod
    def save_game_in_archive_database(game_id, game_state):
        DBHandler.delete_matching_documents("PendingGames", {"gameId": game_id})
        DBHandler.insert_new_document("CompletedGames", {"gameId": game_id, "gameState": game_state})

    @staticmethod
    def send_output(message):
        IOTools.OutputBuffer.append(message)

    def handle_input(self, inp):
        action = inp["action"]
        if action is None:
            return
        elif action == "createNewGame":
            options = inp["options"]
            self.create_new_game(options["gameCoinAddress"], options["coinChainName"])
        else:
            # TODO : Add more Handlers
            pass

    def create_game_with_options(self, build_options):
        if len(self.activeGames) >= self.configs["generalValues"]["maxGameCap"]:
            raise self.GameException("Max Game Limit Reached")
        new_game = Game(handler_parent=self,
                        general_values=self.configs["generalValues"],
                        default_game_values=self.configs["defaultGameValues"],
                        default_player_values=self.configs["defaultPlayerValues"],
                        build_options=build_options, stage_durations=self.configs["stageDurations"])
        th = threading.Thread(target=new_game.run)
        self.activeGames[new_game.get_game_id()] = {"Game": new_game, "Thread": th}

    def create_new_game(self, game_coin_address=None, coin_chain_name=None):
        if game_coin_address is None:
            self.create_game_with_options({})
        else:
            self.create_game_with_options({
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
        if game_id in self.activeGames:
            # TODO : Convert Player Address to checksum address
            success, message = self.activeGames[game_id]["Game"].add_new_player({"playerId": player_address})
        else:
            # TODO : Send reply back to js
            pass


if __name__ == '__main__':
    if len(sys.argv) >= 5:
        Game_Handler = GameHandler()
        DBHandler = IOTools.DBHandler(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
        io_elements = build_io_threads()

        while shouldContinue:
            time.sleep(2.5)

        for io_elem in io_elements:
            io_elem["Object"].stop()
            if io_elem["Thread"].is_alive():
                io_elem["Thread"].join()

        Game_Handler.stop()  # Internally also calls DBHandler.stop()
