export function createServer(): string {
  return "Ergo Protocol server scaffold";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(createServer());
}