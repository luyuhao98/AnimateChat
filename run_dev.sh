#!/bin/zsh
if [ $# -eq 0 ];then
	FLASK_ENV=development FLASK_APP=app.py flask run --host=0.0.0.0
else
	FLASK_ENV=development FLASK_APP=app.py flask run -p $1 --host=0.0.0.0
fi
