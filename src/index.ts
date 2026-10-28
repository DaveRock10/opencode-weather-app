import { handleChoice } from "./menu.ts";
import { loadConfig } from "./storage.ts";
import { style } from "./theme.ts";
import {
  ask,
  closeReadline,
  inputClosed,
  pause,
  printError,
  renderMenu,
} from "./ui.ts";

async function main(): Promise<void> {
  const config = await loadConfig();
  let running = true;

  while (running && !inputClosed()) {
    renderMenu(config);
    const choice = await ask("  Selecciona una opción: ");
    if (inputClosed()) break;

    try {
      running = await handleChoice(choice, config);
    } catch (error) {
      printError(error);
      await pause();
    }
  }

  closeReadline();
  console.log(style.dim("\n  ¡Hasta luego!\n"));
}

await main();
