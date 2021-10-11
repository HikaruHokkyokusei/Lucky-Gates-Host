import copy
import random
import time
import uuid


class Game:
    def __init__(self, handler_parent, general_values, default_game_values, default_player_values,
                 build_options, stage_durations):
        self.handler_parent = handler_parent
        self.general_values = copy.deepcopy(general_values)
        self.default_player_values = copy.deepcopy(default_player_values)
        self.stageDurations = copy.deepcopy(stage_durations)
        self.step_duration = self.general_values["stageStepDuration"]

        self.game_key_list = [
            "gameCoinAddress",
            "coinChainName",
            "minPlayers",
            "maxPlayers",
            "players",
            "currentStage",
            "stageStartTime",
            "stageEndTime",
            "hasStageEnded",
            "requiredDoorSelectionStage",
            "currentChoiceMakingPlayer",
            "gameEndReason"
        ]
        self.player_key_list = [
            "userSocketId",
            "reasonForRemovalFromGame",
            "totalPoints",
            "doorPattern",
            "hasMadeChoice",
            "selectedDoor",
            "wantToSwitchDoor"
        ]

        self.gameState = {
            "buildSuccess": False,
            "gameId": build_options["gameId"] if "gameId" in build_options else uuid.uuid4()
        }
        for key in self.game_key_list:
            self.gameState[key] = build_options[key] if key in build_options \
                else copy.deepcopy(default_game_values[key])

    def get_game_id(self):
        return self.gameState["gameId"]

    def get_player_count(self):
        return len(self.gameState["players"])

    def add_player_to_game(self, options):
        # TODO : Complete this...
        # Set authentication to verify player identity
        # Must check if the player has tickets for the current game

        if not self.is_current_state_equal_to(0):
            return False, "Game Is Not Accepting Players Presently"

        if len(self.gameState["players"]) >= self.gameState["maxPlayers"]:
            return False, "Max Players Have Joined The Game"

        new_player = {"playerId": options["playerId"]}
        for existing_player in self.gameState["players"]:
            if existing_player["playerId"] == new_player["playerId"]:
                return False, "Player Already Exists In The Game"

        for key in self.player_key_list:
            if key in options:
                new_player[key] = options[key]
            else:
                new_player[key] = copy.deepcopy(self.default_player_values[key])
        self.gameState["players"].append(new_player)
        return True

    def pay_for_player(self, player_index: int):
        # TODO : Complete this...
        # Return True if payment is successful, otherwise return False
        # We already check for tickets during add, but this is an additional measure
        pass

    def reset_player_doors(self, player_index):
        if 0 <= player_index < len(self.gameState["players"]):
            current_player = self.gameState["players"][player_index]
            current_player["hasMadeChoice"] = False
            current_player["selectedDoor"] = -1
            current_player["wantToSwitchDoor"] = False
            current_player["doorPattern"] = copy.deepcopy(self.general_values["doorPointsList"])
            random.shuffle(current_player["doorPattern"])

    def remove_player_from_game(self, player_index: int, remove_reason, should_refund=False):
        if 0 <= player_index < len(self.gameState["players"]):
            removed_player = self.gameState["players"].pop(player_index)
            removed_player["reasonForRemovalFromGame"] = remove_reason

        if should_refund:
            # TODO : Complete this...
            pass

    def remove_all_players(self, remove_reason, should_refund):
        while len(self.gameState["players"]) > 0:
            self.remove_player_from_game(0, remove_reason, should_refund)

    def remove_players_with_least_points(self):
        if len(self.gameState["players"]) > 1:
            players_with_min_points = []
            min_points = self.gameState["players"][0]["totalPoints"]

            for i in range(len(self.gameState["players"])):
                if self.gameState["players"][i]["totalPoints"] == min_points:
                    players_with_min_points.append(i)
                elif self.gameState["players"][i]["totalPoints"] < min_points:
                    min_points = self.gameState["players"][i]["totalPoints"]
                    players_with_min_points = [i]

            if len(players_with_min_points) < len(self.gameState["players"]):
                players_with_min_points.sort()
                removed_player_count = 0

                for player_index in players_with_min_points:
                    self.remove_player_from_game(players_with_min_points[player_index] - removed_player_count,
                                                 f"Removed For Securing Least Total Points : {min_points}", False)
                    removed_player_count += 1

    def is_current_state_equal_to(self, stage: int):
        return self.gameState["currentStage"] == stage

    def get_stage_start_time(self):
        return self.gameState["stageStartTime"]

    def get_stage_end_time(self):
        return self.gameState["stageEndTime"]

    def set_current_stage_to(self, stage: int):
        self.gameState["currentStage"] = stage
        self.gameState["stageStartTime"] = time.time()
        self.gameState["stageEndTime"] = self.get_stage_start_time() + (self.stageDurations[
                                                                            str(self.gameState["currentStage"])] * 1000)

    def get_has_stage_ended(self):
        return self.gameState["hasStageEnded"]

    def set_has_stage_ended_to(self, has_stage_ended: bool):
        self.gameState["hasStageEnded"] = has_stage_ended

    def send_reward_to_winner(self):
        # TODO : Complete this function by send request to js
        pass

    def has_reward_been_sent(self):
        # TODO : Complete this function and ask js if it has sent the transfer Transaction...
        pass

    def send_game_to_archive(self, archive_name="Completed"):
        # TODO : Complete this...
        game_id = self.gameState["gameId"]

        # Check if game_id present in saved states. If yes, then remove it from saved states...

        if archive_name == "Completed":
            pass
        elif archive_name == "Pending Reward":
            pass

    def run(self):
        if self.get_stage_start_time() == 0:
            self.set_current_stage_to(self.gameState["currentStage"])

        # Game Stage Number Convention Specified In Comments
        # 0) Player Gathering Stage
        if self.is_current_state_equal_to(0):
            while time.time() < self.get_stage_end_time():
                if self.get_player_count() >= self.gameState["maxPlayers"]:
                    break
                else:
                    time.sleep(secs=self.step_duration)
            if self.get_player_count() < self.gameState["minPlayers"]:
                self.remove_all_players("Not Enough Players", False)
                self.set_current_stage_to(6)
            else:
                self.set_current_stage_to(1)

        # --> 1) Payment Stage
        if self.is_current_state_equal_to(1):
            i = 0
            while i < len(self.gameState["players"]):
                if self.pay_for_player(i):
                    i += 1
                else:
                    self.remove_player_from_game(i, "Ticket Payment Unsuccessful", False)
            if len(self.gameState["players"]) < self.gameState["minPlayers"]:
                self.remove_all_players("Not Enough Player Completed Payment", True)
                self.set_current_stage_to(6)
            else:
                self.set_current_stage_to(2)

        # Stages 2 to 4
        while 2 <= self.gameState["currentStage"] <= 4:
            # Pre-Check-1
            if self.gameState["currentChoiceMakingPlayer"] >= len(self.gameState["players"]):
                self.remove_players_with_least_points()
                self.gameState["currentChoiceMakingPlayer"] = 0
            # Pre-Check-2
            if len(self.gameState["players"]) <= 1:
                self.set_current_stage_to(5)
                break

            current_player = self.gameState["players"][self.gameState["currentChoiceMakingPlayer"]]

            # --> 2) Door Selection Stage
            if self.is_current_state_equal_to(2):
                self.reset_player_doors(self.gameState["currentChoiceMakingPlayer"])

                while time.time() < self.get_stage_end_time():
                    if current_player["hasMadeChoice"]:
                        break
                    time.sleep(secs=self.step_duration)

                if current_player["hasMadeChoice"]:
                    current_player["hasMadeChoice"] = False
                    self.set_current_stage_to(3)
                else:
                    current_player["totalPoints"] += self.general_values["nonSelectionPenalty"]
                    self.gameState["currentChoiceMakingPlayer"] += 1
                    self.set_current_stage_to(2)

            # --> 3) Door Switch Choice Stage
            if self.is_current_state_equal_to(3):
                while time.time() < self.get_stage_end_time():
                    if current_player["hasMadeChoice"]:
                        current_player["hasMadeChoice"] = False
                        break
                    time.sleep(secs=self.step_duration)

                if current_player["wantToSwitchDoor"]:
                    self.set_current_stage_to(4)
                else:
                    current_player["totalPoints"] += current_player["doorPattern"][current_player["selectedDoor"]]
                    self.gameState["currentChoiceMakingPlayer"] += 1
                    self.set_current_stage_to(2)

            # --> 4) Door Selection After Switch Stage
            if self.is_current_state_equal_to(4):
                while time.time() < self.get_stage_end_time():
                    if current_player["hasMadeChoice"]:
                        break
                    time.sleep(secs=self.step_duration)

                if current_player["hasMadeChoice"]:
                    current_player["totalPoints"] += current_player["doorPattern"][current_player["selectedDoor"]]
                    current_player["hasMadeChoice"] = False
                    self.set_current_stage_to(3)
                else:
                    current_player["totalPoints"] += self.general_values["nonSelectionPenalty"]
                    self.set_current_stage_to(2)

                self.gameState["currentChoiceMakingPlayer"] += 1

        # --> 5) Game End and Reward Distribution Stage
        if self.is_current_state_equal_to(5):
            winner_player = self.gameState["players"][0]
            self.send_reward_to_winner()
            while time.time() < self.get_stage_end_time() and not self.has_reward_been_sent():
                time.sleep(secs=self.step_duration)

            self.send_game_to_archive("Completed" if self.has_reward_been_sent() else "Pending Reward")
            self.set_current_stage_to(6)

        # TODO : Complete below stages...
        # --> 6) Database Clear Stage
        # --> 7) Waiting to be Deleted
