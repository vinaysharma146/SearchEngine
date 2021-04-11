# SearchEngine

## Table of contents
* [General info](#general-info)
* [Pre requisites](#pre-requisites)
* [Technologies](#technologies)
* [Setup](#setup)

## General info
This project is a simple Search Engine.

Consists of three components
* <a href="https://www.contentkingapp.com/academy/control-crawl-indexing/#how-does-crawling-work">Crawler</a> (Crawls for urls)
* <a href="https://www.contentkingapp.com/academy/control-crawl-indexing/#how-does-indexing-work">Indexer</a> (Indexes different words)
* Query Engine (UI used for searching)

## Pre requisites
* <a href="https://phoenixnap.com/kb/install-node-js-npm-on-windows">Nodejs and npm</a>
* <a href="https://docs.mongodb.com/manual/installation/">Mongodb</a>

## Technologies
Project is created with:
* npm: 6.14.6
* Nodejs: v12.18.3
* Mongodb: 4.4.0

### Setup
To run this project, install it locally using npm
```
$ npm install
$ node crawler.js * Let it finish *
$ node indexer.js * Let it finish *
$ npm start
```
