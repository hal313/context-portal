#!/bin/sh

## Move to the top level of the repo
cd `git rev-parse --show-toplevel`


## Fail if the workspace is not clean
if [ -n "$(git status --porcelain)" ]; then
  echo This workspace is not clean so a release cannot be created
  exit 1
fi


## Bump the version
npm version --no-git-tag-version patch
## Set the version
export VERSION=`node -e "console.log(require('./package.json').version);"`


## Announcement
echo Building release: $VERSION


## This process roughly follows gitflow
##
##
## Create a new branch and run a build
git checkout -b release/$VERSION
## Make sure the build doesnt fail
npm run verify
npm test

##
## Add and commit the build files and the new package version
git add .
git commit -m 'Build for release'
##
## Checkout the master branch and merge in changes
git checkout master
git merge --no-ff release/$VERSION -m "Merge branch 'release/$VERSION'"
##
## Create a tag and delete the release branch
git tag -a -m 'Tagged for release' $VERSION
git branch -d release/$VERSION
##
## Merge changes into develop
git checkout develop
git merge --no-ff master -m "Merge branch 'master' into develop"
##
## Push changes and tags
git push --all && git push --tags
##
## Reminder to publish to NPM
echo '========================================'
echo 'REMINDER: Publish to npm'
echo '    npm publish'
echo '========================================'
