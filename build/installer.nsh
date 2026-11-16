; Remembers the folder the setup was started from, so that the program can find the
; data of an old portable copy ("CV Maker Data") sitting next to the setup file.
!macro customInstall
  FileOpen $0 "$INSTDIR\installer-dir.txt" w
  FileWriteUTF16LE $0 "$EXEDIR"
  FileClose $0
!macroend
