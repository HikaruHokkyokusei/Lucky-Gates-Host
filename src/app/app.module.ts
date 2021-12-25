import {NgModule} from '@angular/core';
import {MatTooltipModule} from "@angular/material/tooltip";
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
import {RoutingService} from "./services/routing.service";
import {TicketBuyWindowComponent} from './ticket-buy-window/ticket-buy-window.component';
import {AspectVideoComponent} from './UIElements/aspect-video/aspect-video.component';
import {ServiceWorkerModule} from '@angular/service-worker';
import {environment} from '../environments/environment';
import {AboutWindowComponent} from './about-window/about-window.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

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
    AspectVideoComponent,
    AboutWindowComponent
  ],
  imports: [
    BrowserModule,
    RoutingService,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
    BrowserAnimationsModule,
    MatTooltipModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
