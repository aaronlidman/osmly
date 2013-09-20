apt-get -y update
apt-get -y upgrade
apt-get -y install vim git htop python-pip python-dev build-essential nginx libgeos-dev
pip install uwsgi flask shapely

cp nginx.conf /etc/nginx/sites-enabled/osmly
/usr/local/bin/uwsgi --socket 127.0.0.1:4242 --module server --callable app --daemonize log.txt

service nginx restart
