const request = require('request')
const cheerio = require('cheerio')
const fs = require('fs')
const await = require('await')
const fetch = require('node-fetch');
const { htmlToText } = require('html-to-text');

// *****       Mongo Files **********
const mongoose = require('mongoose');
const { exit } = require('process');
const { log } = require('console');

var mongoDB = 'mongodb://localhost/search_engine';
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on('error', (err) => {
    console.log("DB Connection Error");
});

mongoose.connection.on('connected', (err) => {
    console.log("DB connected Successfully");
});

var Schema = mongoose.Schema;

var indexer_schema = Schema({
    word : String,
    info : [{url : String, priority : Number}]
});

var url_schema = Schema({
    level: Number,
    url_list: [String],
    completed: Number,
    readTill : {type: Number, default: 0}
});

var urlDetails = mongoose.model("url_details", url_schema, "url_details");
var indexerDetails = mongoose.model("indexer_details", indexer_schema, "indexerDetails");

async function getSourceCode(url){
    let sourceCode
    await fetch(url)
        .then(
            async function(response){
                if(response.status!=200)
                    return 0
                await response.text().then(async function(data){
                    sourceCode=data
                })
            }
        )
    return sourceCode
}

excludedWords=[]
getExcludedWords()

async function getLevel(){
    let query = urlDetails.findOne({readTill:{$gte:0}}).sort('level')
    //let query = urlDetails.findOne({}).sort('level')
    let result = await query.exec()
    return result
}

async function getExcludedWords(){
    var words=[]
    var read_file = fs.readFileSync('strip.txt','utf-8')
    words=read_file.split('\n')
    for (word of words){
        excludedWords.push(word)
    }
    return words;
}

function getHTMLText(sourceCode,tag){
    var str = new RegExp("\<\\s*"+tag+"[^>]*>(.*?)<\\s*\/\\s*"+tag+">","g");
    if(!sourceCode)
        return 0;
    var test = sourceCode.search(str);
    if(test==-1)
        return ''

    const text = htmlToText(sourceCode,{wordwrap:130,baseElement:tag,
        tags:{
            'img': { format: 'skip' },
            'a': { options: { ignoreHref: true } }
        }
    })
    return text

}

async function updateCrawler(level,i,len){
    let readTill=i+1
    if(i==len-1)
        readTill=-1
    query  = urlDetails.updateOne({level:level},{$set:{readTill:readTill}})
    result = await query.exec()
}

async function saveWords(rawWords,url,priority){

    if(rawWords==null)
        return;
    words=[]
    rawWords.forEach(word=>{
        if(!excludedWords.includes(word))
            words.push(word.toLowerCase())
    })
    for (word of words){
        //console.log(word)
        query = indexerDetails.find({word:word})
        result = await query.exec()
        //console.log(result)
        if(result.length == 0){
        //create new record

            newIndexerDetails = new indexerDetails({
                word:word,
                info:[{url:url,priority:priority}]
            })
            await newIndexerDetails.save()
        }
        else{

            const exists = await indexerDetails.findOne({word:word,"info.url":url,"info.priority":priority})
            if(exists)
                continue

            let info = {url : url,priority: priority}
            query = indexerDetails.updateOne({word:word}, {$push:{info:info}})
            result = await query.exec()
        }
    }
}

async function start(){

    let levelDetails = await getLevel()
    if(levelDetails==null){
        console.log("Indexer Completed")
        exit(0)
    }
    let level = levelDetails.level
    console.log(level)
    let url_list = levelDetails.url_list
    for(let i=0;i<url_list.length;i++)
    {
        let priority=0;
        if(i<levelDetails.readTill)
            continue
        let sourceCode = await getSourceCode(url_list[i])
        if(sourceCode) {
            const title = getHTMLText(sourceCode, 'title')
            const h1 = getHTMLText(sourceCode, 'h1')
            const h2 = getHTMLText(sourceCode, 'h2')
            const h3 = getHTMLText(sourceCode, 'h3')
            const h4 = getHTMLText(sourceCode, 'h4')
            const h5 = getHTMLText(sourceCode, 'h5')
            const h6 = getHTMLText(sourceCode, 'h6')
            const p = getHTMLText(sourceCode, 'p')
            const body = getHTMLText(sourceCode, 'body')
            fs.writeFileSync('body.txt', body)
            const titleWords = title.match(/\b(\w+)\b/g);
            var h1Words = h1.match(/\b(\w+)\b/g)
            var h2Words = h2.match(/\b(\w+)\b/g)
            var h3Words = h3.match(/\b(\w+)\b/g)
            var h4Words = h4.match(/\b(\w+)\b/g)
            var h5Words = h5.match(/\b(\w+)\b/g)
            var h6Words = h6.match(/\b(\w+)\b/g)
            var pWords = p.match(/\b(\w+)\b/g)
            var bodyWords = body.match(/\b(\w+)\b/g)

            await saveWords(titleWords, url_list[i], ++priority)
            await saveWords(h1Words, url_list[i], ++priority)
            await saveWords(h2Words, url_list[i], ++priority)
            await saveWords(h3Words, url_list[i], ++priority)
            await saveWords(h4Words, url_list[i], ++priority)
            await saveWords(h5Words, url_list[i], ++priority)
            await saveWords(h6Words, url_list[i], ++priority)
            await saveWords(pWords, url_list[i], ++priority)
            await saveWords(bodyWords, url_list[i], ++priority)
        }

        await updateCrawler(level,i,url_list.length)
    }
    start();
}


start();
