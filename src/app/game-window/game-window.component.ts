import {Component, Input, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-game-window[appComponent]',
  templateUrl: './game-window.component.html',
  styleUrls: ['./game-window.component.css']
})
export class GameWindowComponent implements OnInit {

  @Input() appComponent!: AppComponent;
  doorIndices: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  constructor() {
  }

  ngOnInit(): void {
  }

}
