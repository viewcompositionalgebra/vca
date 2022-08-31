# About

<img src="./vca.png"/>

Core library code for [view composition algebra](https://www.dropbox.com/s/7olf7jy79way7qd/compalgebra-vis21-submitted.pdf?dl=0) paper.
See the demo at [https://viewcompositionalgebra.github.io/](https://viewcompositionalgebra.github.io/)



# Setup

### Setup database

* [setup postgresql 12](https://www.postgresql.org/docs/12/tutorial-install.html)
* [setup Apache Madlib extensions for postgres](https://cwiki.apache.org/confluence/display/MADLIB/Installation+Guide)
* setup and populate the database

      createdb test
      psql -f ./data/data.ddl test


### Installation

      npm install

# Running

      npm run build
      babel-tape-runner test/<test(s)>
