import "colors";

export function displayHeader(): void {
  process.stdout.write("\x1Bc");

  console.log(
    `
            ${
              "██╗    ██╗ ██╗ ███╗   ██╗ ███████╗ ███╗   ██╗ ██╗ ██████╗"
                .rainbow
            }  
            ${
              "██║    ██║ ██║ ████╗  ██║ ██╔════╝ ████╗  ██║ ██║ ██╔══██╗".cyan
            } 
            ${
              "██║ █╗ ██║ ██║ ██╔██╗ ██║ ███████╗ ██╔██╗ ██║ ██║ ██████╔╝".green
            } 
            ${
              "██║███╗██║ ██║ ██║╚██╗██║ ╚════██║ ██║╚██╗██║ ██║ ██╔═══╝".yellow
            }  
            ${
              "╚███╔███╔╝ ██║ ██║ ╚████║ ███████║ ██║ ╚████║ ██║ ██║".blue
            }      
            ${" ╚══╝╚══╝  ╚═╝ ╚═╝  ╚═══╝ ╚══════╝ ╚═╝  ╚═══╝ ╚═╝ ╚═╝".red}  

            ${"🔥 Join grup TG:".bold} ${"@winsnip".underline.bgCyan}

            ${"❤️  Please appreciate with join my group:".bold} ${
      "https://t.me/winsnip".underline.cyan
    }
            ${
              "❤️  This ensures users can join the Telegram community easily and stay engaged with updates and discussions."
                .bold
            }
            ${"❤️  Don't forget Trakteer Coffee:".bold} ${
      "https://trakteer.id/Winsnipsupport/tip".underline.cyan
    }
  `
      .split("\n")
      .join("\n")
  );
}
