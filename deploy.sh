  cd public
  FULL_REPO="https://$GH_TOKEN@github.com/shirhatti/shirhatti.github.io.git"
  git init
  git config user.name "Travis-CI"
  git config user.email "sourabh@shirhatti.com"
  git add -A
  git commit -m "Deploy to GitHub Pages"
  git push --force --quiet $FULL_REPO master