export class Theme {
  constructor(
    public bgImage: string,
    public buttonBgColor: string,
    public buttonTextColor: string,
    public headerBgColor: string,
    public headerTitleColor: string,
    public myTurnHeaderColor: string,
    public otherTurnHeaderColor: string
  ) {
  }
}

export abstract class ThemeService {

  static themeList: Theme[] = [
    new Theme(
      "../assets/images/Body-BG.jpg",
      "#151515",
      "#ff5b82",
      "#faebd7",
      "#880000",
      "#e3183e",
      "#2a2a2a"
    )
  ];
  static currentTheme: number = 0;

  static getTheme = () => {
    return this.themeList[this.currentTheme];
  };
}
