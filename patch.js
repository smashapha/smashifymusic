const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
`      </div>
  );
};

const NotFound = () => {`,
`      </div>
    </div>
  );
};

const NotFound = () => {`
);
fs.writeFileSync('src/App.tsx', code);
