# adapted from http://www.collectivedisorder.com/ubuntu
(
# install everything
apt-get --assume-yes update
apt-get --assume-yes install make automake gcc gcc+ git python-setuptools uwsgi nginx uwsgi-plugin-python python-pip python-virtualenv libgeos-c1

# setup app
pip install uwsgi shapely
cd /var/www
git clone https://github.com/aaronlidman/parks-project.git
cd parks-project
mkdir /var/log/osmly

# install flask
virtualenv ./env
. env/bin/activate
pip install Flask
deactivate

# setup permissions
usermod -a -G www-data $USER
chown -R $USER:www-data /var/www/parks-project
chmod -R g+w /var/www/parks-project

# config nginx
ln -s /var/www/parks-project/nginx.conf /etc/nginx/sites-enabled/osmly
service nginx restart

# config uwsgi
ln -s /var/www/parks-project/nginx.conf /etc/uwsgi/apps-enabled/osmly.ini
service uwsgi restart

) >> /var/log/osmly.log 2>&1


uwsgi --socket 127.0.0.1:3031 --file /var/www/parks-project/simple.py --callable osmly --processes 2
uwsgi --socket 127.0.0.1:3031 -w myapp:app --workers 4
