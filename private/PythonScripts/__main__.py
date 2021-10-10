import json
import sys
import threading
import time


def print_json_to_stdout(message):
    print(f"{json.dumps(message)}")
    sys.stdout.flush()


_input_buffer = []


class ContinuousFileReader:
    def __init__(self, comm_file_path):
        self.should_read = True
        self.comm_file_path = comm_file_path

    def stop_reading(self):
        self.should_read = False

    def run(self):
        in_file = open(self.comm_file_path)
        while self.should_read:
            for line in in_file:
                if line != '':
                    try:
                        inp = json.loads(line)
                        # print_json_to_stdout(inp)
                        _input_buffer.append(inp)
                    except json.decoder.JSONDecodeError:
                        # TODO : Handle this exception...
                        # Input is not of json format
                        pass
            time.sleep(0.2)
        in_file.close()


if __name__ == '__main__':
    c_f_r = ContinuousFileReader("./communicationFile.txt")
    th = threading.Thread(target=c_f_r.run)
    th.start()
