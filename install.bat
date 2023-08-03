@echo off
powershell.exe -Command "& {Start-Process cmd.exe -ArgumentList '/k cd /d %~dp0 && npm install' -Verb RunAs}"
