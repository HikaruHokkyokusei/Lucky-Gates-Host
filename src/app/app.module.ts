import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {ButtonComponent} from './UIElements/button/button.component';
import {MainMenuComponent} from './main-menu/main-menu.component';
import {PlayerMenuComponent} from './player-menu/player-menu.component';
import {GameWindowComponent} from './game-window/game-window.component';
import {JoinMenuComponent} from './join-menu/join-menu.component';
import {AnimatedImageComponent} from './UIElements/animated-image/animated-image.component';
import {PopUpComponent} from './UIElements/pop-up/pop-up.component';
import {RulesWindowComponent} from './rules-window/rules-window.component';
import {RoutingModule} from "./routing.module";
import {TicketBuyWindowComponent} from './ticket-buy-window/ticket-buy-window.component';
import {AspectVideoComponent} from './UIElements/aspect-video/aspect-video.component';
import {ServiceWorkerModule} from '@angular/service-worker';
import {environment} from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    ButtonComponent,
    MainMenuComponent,
    PlayerMenuComponent,
    GameWindowComponent,
    JoinMenuComponent,
    AnimatedImageComponent,
    PopUpComponent,
    RulesWindowComponent,
    TicketBuyWindowComponent,
    AspectVideoComponent
  ],
  imports: [
    BrowserModule,
    RoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
