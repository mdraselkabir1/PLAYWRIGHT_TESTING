import { Page } from '@playwright/test';

export class ServicesLocators {
  readonly serviceCard = '.service, .service-card';
  readonly serviceCardLink = '.service a, .service-card a';
  constructor(_: Page) {}
}
