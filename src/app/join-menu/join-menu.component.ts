import {Component, Input, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-join-menu[appComponent]',
  templateUrl: './join-menu.component.html',
  styleUrls: ['./join-menu.component.css']
})
export class JoinMenuComponent implements OnInit {

  @Input() appComponent!: AppComponent;

  constructor() { }

  ngOnInit(): void {
  }
}
