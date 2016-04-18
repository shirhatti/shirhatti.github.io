#!/bin/sh

if test `uname` = Darwin; then
    curl -sSL https://github.com/spf13/hugo/releases/download/v0.15/hugo_0.15_darwin_amd64.zip -o hugo.tar.gz
    tar -zxf hugo.tar.gz
    mv hugo_0.15_darwin_amd64/hugo_0.15_darwin_amd64 ./hugo
elif test `uname` = Linux; then
    curl -sSL https://github.com/spf13/hugo/releases/download/v0.15/hugo_0.15_linux_amd64.tar.gz -o hugo.tar.gz
    tar -zxf hugo.tar.gz
    mv hugo_0.15_linux_amd64/hugo_0.15_linux_amd64 ./hugo
fi



