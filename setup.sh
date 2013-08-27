apt-get -y update
apt-get -y upgrade
apt-get install vim git htop python-pip python-dev build-essential nginx libgeos
pip install uwsgi flask shapely

ln -sf /parks-project/nginx.conf /etc/nginx/sites-enabled/default