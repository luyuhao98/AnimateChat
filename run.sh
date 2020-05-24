#!/bin/zsh
if [ $# -eq 0 ];then
	FLASK_ENV=development FLASK_APP=app.py flask run
else
	FLASK_ENV=development FLASK_APP=app.py flask run -p $1
fi
