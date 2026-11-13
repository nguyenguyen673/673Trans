// Wikimedia and some other hosts refuse requests that carry no User-Agent (HTTP 403)
export const USER_AGENT = '673Trans (personal translator app)';
export const HTTP_HEADERS = { 'User-Agent': USER_AGENT };
