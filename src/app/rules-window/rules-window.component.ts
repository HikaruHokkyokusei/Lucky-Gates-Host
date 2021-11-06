import {Component, Input, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-rules-window[appComponent]',
  templateUrl: './rules-window.component.html',
  styleUrls: ['./rules-window.component.css']
})
export class RulesWindowComponent implements OnInit {

  @Input() appComponent!: AppComponent;

  constructor() {
  }

  ngOnInit(): void {
  }

}
