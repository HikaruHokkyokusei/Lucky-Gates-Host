import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export abstract class ToolSetService {

  static getRandomNumber = (inclusiveStart: number, exclusiveEnd: number) => {
    let num = Math.floor(Math.random() * (exclusiveEnd - inclusiveStart));
    num += inclusiveStart;
    return num;
  };

  static numberWithCommas = (value: number) => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  static nFormatter = (num: number) => {
    const lookup = [
      {value: 1, symbol: ""},
      {value: 1e3, symbol: "k"},
      {value: 1e6, symbol: "M"},
      {value: 1e9, symbol: "B"},
      {value: 1e12, symbol: "t"},
      {value: 1e15, symbol: "q"},
      {value: 1e18, symbol: "Q"}
    ];
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    let item = lookup.slice().reverse().find((item) => {
      return num >= item.value;
    });
    return item ? (num / item.value).toString().replace(rx, "$1") + item.symbol : "0";
  };
}
