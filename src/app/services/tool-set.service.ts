import {Injectable} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ToolSetService {
    constructor() {
    }

    getRandomNumber = (inclusiveStart: number, exclusiveEnd: number) => {
        let num = Math.floor(Math.random() * (exclusiveEnd - inclusiveStart));
        num += inclusiveStart;
        return num;
    };
}
