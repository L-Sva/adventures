## Binary Map of Windows Processes' PID

I first got all the ids for processes currently running on my system.

```pwsh
Get-Process | Select-Object -Property Id | Sort-Object -Property Id | % {$_.Id} | Set-Variable all_ids
```

I made a BitArray to store the values for the binary map later efficiently.

```pwsh
$bit_arr = New-Object System.Collections.BitArray(40000)
```

Set relevant indexes to be true.

```pwsh
$all_ids | % {$bit_arr[$_] = $true}
```

Cast each value to 0/1 and join into a long string and save to file.

```pwsh
$bit_arr | % {[int]($_)} | Join-String | Out-File ids_exist.txt
```

Read file contents (just made it as back-up for later, instead of having all the data in memory, which can be lost if the session closes unexpectedly). Then, convert to black or white patterns (these names come from ImageMagick).

```pwsh
(Get-Content .\ids_exist.txt).ToCharArray() | % {$_ -eq '1' ? 'pattern:gray0' : 'pattern:gray100'} |
Join-String -Separator ' ' | Set-Variable magick_pattern
```

Make pattern and save. We're done!

```pwsh
Invoke-Expression "magick montage -geometry +0+0 -tile 5000x8 $magick_pattern show:"
```

… but not yet. :cry:
I get the following error running in PowerShell:
```
ResourceUnavailable: Program 'magick.exe' failed to run: […] The filename or extension is too long. […]
```

Windows doesn't like such a long command, so we'll have to tell ImageMagick to read the tile colours from a file. The max length that pwsh allows is (I think?) 32,764 and our string is of length 560,672; this is ~17 times bigger.

```pwsh
$magick_pattern | Out-File magick_patterns.txt
```

The file just saved was read in by ImageMagick and I used this command to show a subset of the data and adjusted size and tiling to get a better image.

```pwsh
magick montage -geometry +0+0 -tile 5000x8 -size 5x5 `@magick_patterns.txt show:
```

This was the final command I used; it ran in the background, whilst I went to do other things in life and it notified me it was done by beeping.

```pwsh
magick montage -geometry +0+0 -tile 250x -size 5x5 `@magick_patterns.txt out.png &&
[System.Console]::Beep(700, 1000)
```

The final image that I got out was what I wanted when I started:
![binary map of PID distribution](https://github.com/L-Sva/adventures/blob/main/PowerShell%20Mini-Adventures/Binary%20Map/out.png)

This shows the distribution of Windows Processes' PID from 0 to 35,749 (calculated from the max PID of 35,652 and rows of 250 values each). Note that the black squares show where there is a valid PID.
