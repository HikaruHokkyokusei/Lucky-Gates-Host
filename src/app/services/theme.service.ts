export class Theme {
  constructor(
    public bgImage: string,
    public bgOpacity: number,
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
      "../assets/images/T1-Body-BG.jpg",
      0.33,
      "#151515",
      "#ff5b82",
      "#faebd7",
      "#880000",
      "#e3183e",
      "#2a2a2a"
    ),
    new Theme(
      "../assets/images/T2-Body-BG.png",
      0.75,
      "#001545",
      "#ffc000",
      "#faebd7",
      "#880000",
      "#e3183e",
      "#2a2a2a"
    )
  ];

  static currentTheme: number = 1;

  static getTheme = () => {
    return this.themeList[this.currentTheme];
  };
}
