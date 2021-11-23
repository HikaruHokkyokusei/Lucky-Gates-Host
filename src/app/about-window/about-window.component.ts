import {Component, Input, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-about-window[appComponent]',
  templateUrl: './about-window.component.html',
  styleUrls: ['./about-window.component.css']
})
export class AboutWindowComponent implements OnInit {

  @Input() appComponent!: AppComponent;

  constructor() {
  }

  ngOnInit(): void {
  }

}
