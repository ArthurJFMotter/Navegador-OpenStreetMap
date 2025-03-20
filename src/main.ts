import { AppModule } from './app/app.module';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

const providers = [
  { provide: "LOCALE_ID", useValue: "pt-BR" }
];

platformBrowserDynamic(providers).bootstrapModule(AppModule).catch((err: any) => console.error(err));
