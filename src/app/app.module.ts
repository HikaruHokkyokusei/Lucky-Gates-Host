import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {ButtonComponent} from './UIElements/button/button.component';
import {MainMenuComponent} from './main-menu/main-menu.component';

@NgModule({
  declarations: [
    AppComponent,
    ButtonComponent,
    MainMenuComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
