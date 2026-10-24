# Skymart Website
## Overview
A full-stack development project made for Skymart intended as an advertisement site with an AI agent acting in the backend

## Frontend Setup
This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Backend Setup
Before any code could be ran, a command is required to be downloaded. This command could be downloaded via the command `winget install astral-sh.uv` for windows powershell.

After installing the command, a few apis in the requirements tab needs to be installed. The required installations can be done using these commands:
- `pip install 'pydantic[email]`
- `pip install google-genai`

After downloading the steps, type the following into the console to run the backend for the first time:
- `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
- `uv add "fastapi[standard]"`
- `uv pip install google-genai`
- `uv run fastapi dev`

To run the backend again, just type `uv run fastapi dev`

In order to get Python to communicate with Gemini, you must navigate to the app.py file in the backend folder (src: `backend/app.py`) and modify the string.
For the safety purposes, once you modify the string, place the file in .gitignore so the token key does not get spilled to the public.

## Running the Website
To run the webiste, first start up the backend for the website. This is done first by using `cd backend` followed then by using the command `fast dev main.py`.

In order to run the Front end part of this application, you have to install npm

From there on out, the next thing is to use command prompt, then use cd \[path\]/frontend where the "path" would be the location of the file on the computer.
Alternatively, if you are modifying the code behind the website using visual code studios (or any IDE for that matter), you may also open the terminal, type `cd frontend`, and then type the commands that you need to in order to run the website.

Some IDEs prevent you from running the website using the terminal so for those cases, be sure to type `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` into the terminal before trying to run the code.

With command prompt, first type `npm run build` to build the website.

Then type `npm run preview` to get a link to allow you to run the website on your local computer.

After running the website, you may close the website at any time by pressing Ctrl+C in the command prompt/IDE terminal.

If the code inside the src or public folders were at any point modified after you run the code, please type `npm run build` in the command prompt/IDE terminal to run the website so then when you type `npm run preview` again, the website will update properly.

A shortcut also exists where you may simply use `npm run run` instead.