nextgiscrowd
============

Crowdsourcing tool to collect and edit spatial data

Example projects using NGC:

* [uikgeo](http://uikgeo.ru)

Current limitations:

* points only


##Load data
cd /home/user/projects/ngcrowd/nextgiscrowd/import
../../bin/python initialize_db.py crowd --csv data/input.csv --conf config.json --db_conf ../development.ini

##Start

```bash
cd /home/user/projects/ngcrowd/nextgiscrowd
../bin/pserve development.ini --daemon start
```

##Restart

```bash
cd /home/user/projects/ngcrowd/nextgiscrowd
git pull
../bin/pserve development.ini --daemon restart
```
