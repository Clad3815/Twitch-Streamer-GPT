@echo off
powershell.exe -Command "& {Start-Process cmd.exe -ArgumentList '/k cd /d %~dp0 && node index.js' -Verb RunAs}"
