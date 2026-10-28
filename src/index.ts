import { handleChoice, renderMenu } from "./presentation/menu.ts";
import { ask, closeReadline, inputClosed, pause } from "./presentation/input.ts";
import { printError } from "./presentation/output.ts";
import { loadConfig } from "./storage/settingsStorage.ts";
import { style } from "./utils/colors.ts";

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
