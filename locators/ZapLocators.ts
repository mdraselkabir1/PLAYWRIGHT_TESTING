// locators/ZapLocators.ts

export class ZapLocators {
  // Docker
  static readonly ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable';
  static readonly CONTAINER_NAME = 'zap-container';
  static readonly PROXY_PORT = 8080;
  static readonly API_KEY = 'zapkey';
  static readonly API_BASE = 'http://localhost:8080';

  // Startup
  static readonly VERSION = '/JSON/core/view/version/';

  // Spider (passive)
  static readonly SPIDER_SCAN = '/JSON/spider/action/scan/';
  static readonly SPIDER_STATUS = '/JSON/spider/view/status/';

  // Active scan
  static readonly ASCAN_SCAN = '/JSON/ascan/action/scan/';
  static readonly ASCAN_STATUS = '/JSON/ascan/view/status/';

  // AJAX spider
  static readonly AJAX_SPIDER_SCAN = '/JSON/ajaxSpider/action/scan/';
  static readonly AJAX_SPIDER_STATUS = '/JSON/ajaxSpider/view/status/';

  // Reports
  static readonly HTML_REPORT = '/OTHER/core/other/htmlreport/';
  static readonly ALERTS_JSON = '/JSON/core/view/alerts/';
}
