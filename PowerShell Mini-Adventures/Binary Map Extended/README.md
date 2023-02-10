## Boxed Map showing Process details

As an extension to my Binary Map adventure, I wanted to show more details, rather than just black boxes to show that a process had that PID. I decided to show the number of threads that process was using as a text within the box, the company that made the program labelled by the border colour and the image of the program, from its exe path, if it exists.

First, I looked into the code to get the max number of threads that any process was using, to adjust size of text in the final image.

```pwsh
Get-Process | Select-Object Name, Id, @{Name='Thread Count'; Expression={$_.Threads.Count}} | Sort-Object -Property 'Thread Count' -Descending | Select-Object -First 20
```

That code returned the following table:
<table>
<colgroup><col/><col/><col/></colgroup>
<tr><th>Name</th><th>Id</th><th>Thread Count</th></tr>
<tr><td>explorer</td><td>27040</td><td>491</td></tr>
<tr><td>System</td><td>4</td><td>323</td></tr>
<tr><td>Dell.D3.WinSvc</td><td>17068</td><td>242</td></tr>
<tr><td>msedge</td><td>15704</td><td>119</td></tr>
<tr><td>NVIDIA Web Helper</td><td>12060</td><td>95</td></tr>
<tr><td>sqlservr</td><td>5408</td><td>95</td></tr>
<tr><td>Memory Compression</td><td>2408</td><td>58</td></tr>
<tr><td>SearchHost</td><td>21868</td><td>54</td></tr>
<tr><td>MsMpEng</td><td>5144</td><td>51</td></tr>
<tr><td>svchost</td><td>2224</td><td>47</td></tr>
<tr><td>msedge</td><td>27760</td><td>46</td></tr>
<tr><td>ServiceShell</td><td>16652</td><td>44</td></tr>
<tr><td>NVDisplay.Container</td><td>10524</td><td>42</td></tr>
<tr><td>TextInputHost</td><td>34468</td><td>42</td></tr>
<tr><td>ShellExperienceHost</td><td>35164</td><td>39</td></tr>
<tr><td>WINWORD</td><td>25664</td><td>39</td></tr>
<tr><td>nvcontainer</td><td>4860</td><td>38</td></tr>
<tr><td>NVIDIA Share</td><td>21988</td><td>33</td></tr>
<tr><td>nvcontainer</td><td>9088</td><td>33</td></tr>
<tr><td>SearchIndexer</td><td>3684</td><td>32</td></tr>
</table>

So, max num of characters is 3 for thread count.

This time round, I also wanted to include the origin of the program, e.g. showing MSEdge processes with the Edge icon.

```pwsh
[System.Drawing.Icon]::ExtractAssociatedIcon('C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') | Set-Variable edge_icon
```

These codes download the program image from its exe file location.

```pwsh
$edge_icon.ToBitmap().Save("$(Get-Location)/edge_icon.ico")
```
# improve the info from here on and upload onto GitHub

After some digging through, it seems that svchost is the most common process, but it often lacks the company tag.

```pwsh
Get-Process | Sort-Object -Property Id | 
Select-Object Id, Name, Company, Path, 
@{Name='Thread Count'; Expression={$_.Threads.Count}} |
Select-Object -First 200 | ft
```

Therefore, to see if I had to manually add this info for more processes that repeated often, I grouped by the process name and sorted by count of that.

```pwsh
Get-Process | Select-Object Name, Company |
Group-Object -Property Name -NoElement | Sort-Object Count -Descending | 
Select-Object -First 5
```

This gave the output of:
<table>
<colgroup><col/><col/></colgroup>
<tr><th>Count</th><th>Name</th></tr>
<tr><td>101</td><td>svchost</td></tr>
<tr><td>58</td><td>msedge</td></tr>
<tr><td>19</td><td>crashpad_handler</td></tr>
<tr><td>11</td><td>RuntimeBroker</td></tr>
<tr><td>11</td><td>Code</td></tr>
</table>

Turns out that svchost was the only one that appeared so frequently; I'll make this a separate category and label the ones without a company as just 'other'. But some svchost processes list Microsoft as the company; so, I'll create a union of all the processes when grouped together by name (I'm assuming here that 2 different companies do not have a process with the same name) and use that as the border colour.

I first got the list of programs for which I needed to download the icon for:

```pwsh
Get-Process | Select-Object Name, Company, Path, Id |
Group-Object -Property Name | Sort-Object Count -Descending | Select-Object -First 10
```

This ~~horrendous~~ beautiful piece of code gets the company and path for all processes, as long as at least one with the same name has that info. I saved the output array of ordered dictionaries into an xml file for back-up.

```pwsh
Get-Process | Select-Object Name, Company, Path, Id, Threads |
Group-Object -Property Name | Sort-Object Count -Descending | Select-Object -First 10 |
ForEach-Object {
    [ordered]@{
        Name = $_.Name;
        Company = $_.Group | Where-Object {$_.Company} |
        Select-Object -ExpandProperty Company -First 1;
        Path = $_.Group | Where-Object {$_.Path} |
        Select-Object -ExpandProperty Path -First 1;
        Id = $_.Group | Select-Object -ExpandProperty Id;
        'Thread Count' = $_.Group | % {$_.Threads.Count};
    }
} | Export-Clixml ./process_info.xml
```

I next installed all the icons that I would be using later on.

```pwsh
New-Item -Type Directory -Force ./icons/
$process_info | Where-Object {$_.Path} | 
ForEach-Object {
    [System.Drawing.Icon]::ExtractAssociatedIcon($_.Path).
    ToBitmap().Save("$(Get-Location)/icons/$($_.Name).ico");
}
```

Also, I manually changed the icon only for svchost, because that one appeared the most often and many other miscellaneous programs shared the same icon.

After some investigation in the Image Magick documention, I made a minimal working example of the code boilerplate:

```pwsh
magick montage -font Verdana -pointsize 9 -geometry +0+0 -tile 250x pattern:gray0 pattern:gray100 pattern:gray0 `( ./icons/acrotray.ico[20x20] -gravity south -extent 24x28 -bordercolor red -border 4x2 -gravity north -annotate +0-1 '322' `) pattern:gray0 `( pattern:gray100[20x20] -gravity south -extent 24x28 -bordercolor blue -border 4x2 -gravity north -annotate +0-1 '196' `) show:
```

I first created an array of white squares, which I would later index into to change individual Id positions.

```pwsh
,'pattern:gray100' * 48750 | Set-Variable magick_patterns
```

To assign the colours for each of the companies, I got the list of unique companies that I had:

```pwsh
$process_info | % {$_.Company} | select -Unique
```

| Company | Border Colour |
| --- | --- |
| Microsoft Corporation | blue
| Realtek Semiconductor | yellow
| NVIDIA Corporation | lime
| Adobe Systems Inc. | red
| Intel Corporation | aqua
| f.lux Software LLC | orange
| Soleon Innovations | maroon
| Node.js | green
| A-Volute | fuchsia

This was made into a hashtable and saved as the variable company_hash. This is referred to in the code below:

```pwsh
$process_info | ForEach-Object {
    $colour = $company_hash."$($_.Company)" ?? 'black'
    $path = $_.Path ? ".\icons\$($_.Name).ico" : 'pattern:gray100'

    for ($i=0; $i -lt $_.Id.Length; $i++) {
        $threads = $_.'Thread Count'[$i]

        $magick_patterns[$_.Id[$i]] = "`( $path[20x20] -gravity south -extent 24x28 -bordercolor $colour -border 4x2 -gravity north -annotate +0-1 '$threads' `)"
    }
}
```

The above code contains the logic for making the correct images for each of the processes saved previously in the variable process_info. It gets the relevant colour from the company_hash hash table, and if the company is null, it instead uses black. The path value also follows a similar logic, defaulting to 'pattern:gray100' (i.e. a white box) if path is not given.

Then, I ran the below code to create the image. However, the code did not complete even after 5 minutes - very unusual for Image Magick. I suspect this might be because the final image is too large in size and requires too much memory.

```pwsh
magick montage -font Verdana -pointsize 6 -geometry +0+0 -size 20x20 -tile 250x `@magick_patterns.txt out.png
```

Therefore, I changed the code to process a tenth of the original file at a time. The code below splits the magick_patterns.txt file into 10 smaller files. I will run the montage code and resize on these smaller files indiviually, which should take less time and memory. The value of 5,000 was chosen because ```$magick_patterns.Length/10 = 4875```, but we need a number divisible by 250, as that's the number of columns we have per row.

```pwsh
New-Item -Type Directory magick_patterns_split -Force
$i=0; Get-Content .\magick_patterns.txt -ReadCount 5000 | ForEach-Object {$i++; $_ | Out-File ".\magick_patterns_split\mp_$i.txt"}
```

Here, I use the Parallel flag on the ForEach-Object method to run these processes at once (not quite _all_ at once; only 5 by default run at the same time).

```pwsh
New-Item -Type Directory intermediate -Force
1..10 | ForEach-Object -Parallel {
    magick montage -font Verdana -pointsize 9 -geometry +0+0 -tile 250x "`@magick_patterns_split/mp_$_.txt" "intermediate/out_$($_.ToString('00')).png"
}
```

Then, I join the image together using the following command:

```pwsh
magick convert -append intermediate/out_%02d.png[1-10] all.png
```

This makes my final image and I have completed this (not-so-) Mini-Adventure.
![box map of processes](https://github.com/L-Sva/adventures/blob/main/PowerShell%20Mini-Adventures/Binary%20Map%20Extended/all.png)
