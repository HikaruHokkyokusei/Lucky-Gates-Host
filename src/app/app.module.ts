import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {ButtonComponent} from './UIElements/button/button.component';
import {MainMenuComponent} from './main-menu/main-menu.component';
import {PlayerMenuComponent} from './player-menu/player-menu.component';
import {GameWindowComponent} from './game-window/game-window.component';
import {JoinMenuComponent} from './join-menu/join-menu.component';
import { AnimatedImageComponent } from './UIElements/animated-image/animated-image.component';

@NgModule({
  declarations: [
    AppComponent,
    ButtonComponent,
    MainMenuComponent,
    PlayerMenuComponent,
    GameWindowComponent,
    JoinMenuComponent,
    AnimatedImageComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
