import {Component, Input, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-player-menu[appComponent]',
  templateUrl: './player-menu.component.html',
  styleUrls: ['./player-menu.component.css']
})
export class PlayerMenuComponent implements OnInit {

  @Input() appComponent!: AppComponent;

  constructor() {
  }

  ngOnInit(): void {
  }

}
