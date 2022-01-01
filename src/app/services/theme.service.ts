import {Theme} from "../models/Theme/theme.model";

export abstract class ThemeService {

  static themeList: Theme[] = [
    {
      bgImage: "../assets/images/T1-Body-BG.jpg",
      bgOpacity: 0.33,
      buttonBgColor: "#151515",
      buttonTextColor: "#ff5b82",
      headerBgColor: "#faebd7",
      headerTitleColor: "#880000",
      myTurnHeaderColor: "#e3183e",
      otherTurnHeaderColor: "#2a2a2a"
    },
    {
      bgImage: "../assets/images/T2-Body-BG.png",
      bgOpacity: 0.75,
      buttonBgColor: "#001545",
      buttonTextColor: "#ffc000",
      headerBgColor: "#faebd7",
      headerTitleColor: "#880000",
      myTurnHeaderColor: "#e3183e",
      otherTurnHeaderColor: "#2a2a2a"
    }
  ];

  static currentTheme: number = 1;

  static getTheme = () => {
    return this.themeList[this.currentTheme];
  };
}
