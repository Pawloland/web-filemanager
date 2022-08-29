//zmienne, stałe

var express = require("express")
var app = express()
var PORT = process.env.PORT || 3000; // bardzo istotna linijka - port zostaje przydzielony przez Heroku
var fs = require('fs');

//funkcje na serwerze, obsługujące konkretne adresy
// w przeglądarce

var path = require("path")
var formidable = require('formidable')
var hbs = require('express-handlebars')

app.use(express.static('static'))

app.set('views', path.join(__dirname, 'views'))          // ustalamy katalog views
app.engine('hbs', hbs({
    defaultLayout: 'main01.hbs',
    extname: '.hbs',
    partialsDir: "views/partials",
}))    // domyślny layout, potem można go zmienić
app.set('view engine', 'hbs')                            // określenie nazwy silnika szablonów



var context = {
    table_headers: ['id', 'obraz', 'name', 'size', 'type', '-', '-', '-'],
    supported_file_types: ['jpeg', 'jpg', 'pdf', 'png', 'rar', 'txt'],
    files: []
}

app.get("/", function (req, res) {
    res.render('upload.hbs', context)    // nie podajemy ścieżki tylko nazwę pliku
})

app.get("/upload", function (req, res) {
    res.redirect('/')
})

app.post('/handleUpload', function (req, res) {
    var form = new formidable.IncomingForm()
    form.uploadDir = __dirname + '/static/upload/'       // folder do zapisu zdjęcia
    form.keepExtensions = true                           // zapis z rozszerzeniem pliku
    form.multiples = true                                // zapis wielu plików                          
    form.parse(req, function (err, fields, files) {
        function createEntry(element) {
            let obraz
            if (context.supported_file_types.includes(`${element.name.split('.')[element.name.split('.').length - 1].toLowerCase()}`) == true) {
                obraz = `${element.name.split('.')[element.name.split('.').length - 1].toLowerCase()}`
            } else {
                obraz = 'inne'
            }
            let id
            if (context.files.length == 0) {
                id = 1
            } else {
                id = context.files[context.files.length - 1].id + 1
            }

            context.files.push({
                id: id,
                obraz: obraz,
                name: element.name,
                size: element.size,
                type: element.type,
                delete: `/delete/?id=${id}`,
                info: `/info/?id=${id}`,
                download: `/download/?id=${id}`,
                path: element.path,
                savedate: Date.now(),
            })
            console.log(element.path)
        }


        if (files.imagetoupload == undefined) {
            // zabezpieczenie przed wysłaniem pustego formularza 
            // bug przeglądarki (zwykły user może go przez przypadek wywołać i zawiesić stronę):
            //   drag&drop folderu na input type="file" required, utawia, że input jest wybrany i pozwala wysłać formularz,
            //   ale tak naprawde wybrano folder a nie plik, a formularz nie przyjmuje folderów, tylko pliki, 
            //   więc tak naprawdę wysyłany jest sam undefined zamiast pliku (lub plików, jeśli przez przypadek wysłany został choć jeden
            //   folder wraz z innymi plikami)
            // zabezpiecza to też przed ręcznym wysłaniem takiego formularza przez jakiegoś dowcipnisia ;)
            let error_message = 'Wykryto próbę wysłania pustego formularza!\\nMożliwe, że przez przypadek wybrał-eś/aś folder zamiast plik-u/ów.\\nUpewnij się, że nie wysyłasz folderów i spróbuj jeszcze raz.'
            res.send(`<script>alert("${error_message}"); window.location.href = "/"; </script>`);
            return
        }

        if (Array.isArray(files.imagetoupload) == true) { // multiple files
            for (element of files.imagetoupload) {
                createEntry(element)
            }
        } else { //single file

            createEntry(files.imagetoupload)
        }
        res.redirect('/filemanager')
    })
})

app.get("/filemanager", function (req, res) {
    res.render('filemanager.hbs', context)    // nie podajemy ścieżki tylko nazwę pliku
})

app.get("/info", function (req, res) {
    let result = context.files.filter(element => (element.id == parseInt(req.query.id)))[0]
    let context_new
    if (result != undefined) {
        context_new = {
            entry: {
                id: result.id,
                name: result.name,
                path: result.path,
                size: result.size,
                type: result.type,
                savedate: result.savedate,
            }
        }
    }
    res.render('info.hbs', context_new)    // nie podajemy ścieżki tylko nazwę pliku
})

app.get("/reset", function (req, res) {
    context.files = []
    res.redirect('/filemanager')
})

app.get("/delete", function (req, res) {
    let result = context.files.filter(element => (element.id != parseInt(req.query.id)))
    fs.unlink(context.files.find(element => (element.id == parseInt(req.query.id))).path, () => { })
    context.files = result
    res.redirect('/filemanager')
})

app.get("/download", function (req, res) {
    let result = context.files.filter(element => (element.id == parseInt(req.query.id)))[0]
    res.download(result.path)
})


//nasłuch na określonym porcie

app.listen(PORT, function () {
    console.log("start serwera na porcie " + PORT)
    console.log("ścieżka do katalogu głównego aplikacji: " + __dirname)
})



