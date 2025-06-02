# version.json generated from ./bin/generate-version-file.js
git log -n 1 --no-color --pretty='%s' > ./commit-summary.txt
git log -n 1 --no-color --pretty=medium > ./commit-description.txt
