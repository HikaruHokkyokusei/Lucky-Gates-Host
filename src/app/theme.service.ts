export class Theme {
  constructor(
    public bgImage: string,
    public buttonBgColor: string,
    public buttonTextColor: string,
    public headerTitleColor: string
  ) {
  }
}

export abstract class ThemeService {

  static themeList: Theme[] = [
    new Theme(
      "../assets/images/Body-BG.jpg",
      "#151515",
      "#ff5b82",
      "#880000"
    )
  ];
  static currentTheme: number = 0;

  static getTheme = () => {
    return this.themeList[this.currentTheme];
  };
}
