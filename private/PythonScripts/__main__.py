import threading
import time

import IOTools

should_continue = True
IOElements = []


def exit_function():
    global should_continue
    should_continue = False


def build_io_threads():
    c_f_r = IOTools.ContinuousFileReader("./communicationFile.txt")
    c_i_h = IOTools.ContinuousInputHandler(exit_function=exit_function)
    c_o_w = IOTools.ContinuousOutputWriter()
    c_f_r_th = threading.Thread(target=c_f_r.run)
    c_i_h_th = threading.Thread(target=c_i_h.run)
    c_o_w_th = threading.Thread(target=c_o_w.run)
    IOElements.append({"Object": c_f_r, "Thread": c_f_r_th})
    IOElements.append({"Object": c_i_h, "Thread": c_i_h_th})
    IOElements.append({"Object": c_o_w, "Thread": c_o_w_th})
    c_f_r_th.start()
    c_i_h_th.start()
    c_o_w_th.start()


class GameHandler:
    # TODO : Complete this...
    def __init__(self):
        pass


if __name__ == '__main__':
    build_io_threads()
    while should_continue:
        time.sleep(2)
    for io_elem in IOElements:
        io_elem["Object"].stop()
        if io_elem["Thread"].is_alive():
            io_elem["Thread"].join()
