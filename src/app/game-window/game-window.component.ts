import {Component, Input, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-game-window[appComponent]',
  templateUrl: './game-window.component.html',
  styleUrls: ['./game-window.component.css']
})
export class GameWindowComponent implements OnInit {

  @Input() appComponent!: AppComponent;

  constructor() {
  }

  ngOnInit(): void {
  }

}
