@echo off
powershell.exe -Command "& {Start-Process cmd.exe -ArgumentList '/k title Update && cd /d %~dp0 && node update.js' -Verb RunAs}"
