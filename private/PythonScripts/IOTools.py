import json
import pymongo
import sys
import time

InputBuffer = []
OutputBuffer = []
sleepTime = 0.2


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


class ContinuousFileReader:
    def __init__(self, comm_file_path):
        self.should_read = True
        self.comm_file_path = comm_file_path

    def stop(self):
        self.should_read = False

    def run(self):
        in_file = open(self.comm_file_path)
        while self.should_read:
            for line in in_file:
                if line != '':
                    try:
                        inp = json.loads(line)
                        # print_json_to_stdout(inp)
                        InputBuffer.append(inp)
                    except json.decoder.JSONDecodeError:
                        # TODO : Handle this exception...
                        # Input is not of json format
                        pass
            time.sleep(sleepTime)
        in_file.close()


class ContinuousInputHandler:
    def __init__(self, exit_function, game_handler):
        self.should_handle = True
        self.exit_function = exit_function
        self.game_handler = game_handler

    def stop(self):
        self.should_handle = False

    def root_handler(self, inp):
        command = inp.pop("command", None)
        if command is None:
            return
        elif command == "exit":
            # TODO : Make this block more robust
            self.exit_function()
        elif command == "rebuildFromDB":
            self.game_handler.rebuild_pending_games()
        elif command == "game":
            self.game_handler.handle_input(inp)
        else:
            # TODO : Probably log using a logger...
            pass

    def run(self):
        while self.should_handle:
            while len(InputBuffer) > 0:
                self.root_handler(InputBuffer.pop(0))
            time.sleep(sleepTime)


class DBHandler:
    def __init__(self, username, password, cluster_name, database_name):
        cluster_name = cluster_name.replace(" ", "").lower()
        connect_url = f"mongodb+srv://{username}:{password}@{cluster_name}.zm0r5.mongodb.net/test?retryWrites=true"
        self.cluster = pymongo.MongoClient(connect_url)
        self.database = self.cluster[database_name]

    def stop(self):
        self.cluster.close()

    def get_pending_game_list(self):
        # TODO : Complete this...
        pass
